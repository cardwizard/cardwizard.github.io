require 'json'
require 'pathname'
require 'uri'
require 'fileutils'
require 'nokogiri'

abort 'Usage: bundle exec ruby scripts/check_site.rb <current-site> <baseline-site> <report-dir>' unless ARGV.length == 3
current_root, baseline_root, report_dir = ARGV.map { |path| File.expand_path(path) }
site_origin = URI('https://cardwizard.github.io')

def inspect_site(root, origin)
  files = Dir.glob(File.join(root, '**', '*.html')).sort
  raise "No generated HTML in #{root}" if files.empty?
  documents = {}
  errors = []
  files.each do |file|
    relative = Pathname.new(file).relative_path_from(Pathname.new(root)).to_s
    documents[relative] = Nokogiri::HTML(File.read(file))
  end
  documents.each do |relative, document|
    page_url = URI.join(origin.to_s, "/#{relative}")
    document.css('a[href], img[src], script[src], link[rel="stylesheet"][href], iframe[src]').each do |node|
      reference = node['href'] || node['src']
      next if reference.nil? || reference.empty? || reference == '#' || reference.start_with?('data:', 'mailto:', 'tel:', 'javascript:')
      begin
        url = URI.join(page_url.to_s, reference)
        next unless %w[http https].include?(url.scheme) && url.host == origin.host
        decoded = URI::DEFAULT_PARSER.unescape(url.path)
        target = File.expand_path(".#{decoded}", root)
        unless target == root || target.start_with?("#{root}/")
          errors << "#{relative}: reference escapes site root: #{reference}"
          next
        end
        target = File.join(target, 'index.html') if File.directory?(target)
        unless File.file?(target)
          errors << "#{relative}: missing local resource #{reference}"
          next
        end
        next unless url.fragment && !url.fragment.empty? && File.extname(target) == '.html'
        target_relative = Pathname.new(target).relative_path_from(Pathname.new(root)).to_s
        target_document = documents[target_relative] ||= Nokogiri::HTML(File.read(target))
        fragment = URI::DEFAULT_PARSER.unescape(url.fragment)
        unless target_document.css('[id], a[name]').any? { |element| element['id'] == fragment || element['name'] == fragment }
          errors << "#{relative}: missing local anchor #{reference}"
        end
      rescue URI::InvalidURIError => error
        errors << "#{relative}: invalid reference #{reference.inspect}: #{error.message}"
      end
    end
  end
  { pages: documents.keys.sort, errors: errors.uniq.sort }
end

baseline = inspect_site(baseline_root, site_origin)
current = inspect_site(current_root, site_origin)
missing_routes = baseline[:pages] - current[:pages]
new_errors = current[:errors] - baseline[:errors]
required = %w[index.html blog/index.html projects/index.html publications/index.html news/index.html now/index.html research-paper-cuts/index.html newspaper/index.html]
missing_required = required.reject { |path| current[:pages].include?(path) }
FileUtils.mkdir_p(report_dir)
report = {
  current_page_count: current[:pages].length,
  baseline_page_count: baseline[:pages].length,
  missing_existing_routes: missing_routes,
  missing_required_routes: missing_required,
  introduced_link_errors: new_errors,
  pre_existing_link_errors: current[:errors] & baseline[:errors],
  external_links_checked: false
}
File.write(File.join(report_dir, 'routes-and-links.json'), JSON.pretty_generate(report))
puts "Checked #{current[:pages].length} pages; #{report[:pre_existing_link_errors].length} pre-existing link warnings retained in report."
unless missing_routes.empty? && missing_required.empty? && new_errors.empty?
  warn JSON.pretty_generate(report)
  exit 1
end
